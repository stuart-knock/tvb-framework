# -*- coding: utf-8 -*-
#
#
# TheVirtualBrain-Framework Package. This package holds all Data Management, and 
# Web-UI helpful to run brain-simulations. To use it, you also need do download
# TheVirtualBrain-Scientific Package (for simulators). See content of the
# documentation-folder for more details. See also http://www.thevirtualbrain.org
#
# (c) 2012-2013, Baycrest Centre for Geriatric Care ("Baycrest")
#
# This program is free software; you can redistribute it and/or modify it under 
# the terms of the GNU General Public License version 2 as published by the Free
# Software Foundation. This program is distributed in the hope that it will be
# useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
# License for more details. You should have received a copy of the GNU General 
# Public License along with this program; if not, you can download it here
# http://www.gnu.org/licenses/old-licenses/gpl-2.0
#
#
#   CITATION:
# When using The Virtual Brain for scientific publications, please cite it as follows:
#
#   Paula Sanz Leon, Stuart A. Knock, M. Marmaduke Woodman, Lia Domide,
#   Jochen Mersmann, Anthony R. McIntosh, Viktor Jirsa (2013)
#       The Virtual Brain: a simulator of primate brain network dynamics.
#   Frontiers in Neuroinformatics (7:10. doi: 10.3389/fninf.2013.00010)
#
#
"""
.. moduleauthor:: Calin Pavel <calin.pavel@codemart.ro>
"""
import unittest
import os
import datetime
import demo_data.regionMapping as demo_data
import tvb_test.adapters.uploaders.test_data as test_data
from tvb.basic.filters.chain import FilterChain
from tvb.core.entities.file.files_helper import FilesHelper
from tvb.core.entities.storage import dao
from tvb.core.entities.transient.structure_entities import DataTypeMetaData
from tvb.core.services.flow_service import FlowService
from tvb.core.services.exceptions import OperationException
from tvb.core.adapters.abcadapter import ABCAdapter
from tvb.datatypes.surfaces import RegionMapping, CorticalSurface  
from tvb.datatypes.connectivity import Connectivity
from tvb_test.datatypes.datatypes_factory import DatatypesFactory
from tvb_test.core.base_testcase import TransactionalTestCase
from tvb_test.core.test_factory import TestFactory


class RegionMappingImporterTest(TransactionalTestCase):
    """
    Unit-tests for RegionMapping importer.
    """
    
    TXT_FILE = os.path.join(os.path.dirname(demo_data.__file__), 'original_region_mapping.txt')
    ZIP_FILE = os.path.join(os.path.dirname(demo_data.__file__), 'original_region_mapping.zip')
    BZ2_FILE = os.path.join(os.path.dirname(demo_data.__file__), 'original_region_mapping.bz2')
    
    # Wrong data
    WRONG_FILE_1 = os.path.join(os.path.dirname(test_data.__file__), 'region_mapping_wrong_1.txt')
    WRONG_FILE_2 = os.path.join(os.path.dirname(test_data.__file__), 'region_mapping_wrong_2.txt')
    WRONG_FILE_3 = os.path.join(os.path.dirname(test_data.__file__), 'region_mapping_wrong_3.txt')
    
    def setUp(self):
        """
        Sets up the environment for running the tests;
        creates a test user, a test project, a connectivity and a surface;
        imports a CFF data-set
        """
        self.datatypeFactory = DatatypesFactory()
        self.test_project = self.datatypeFactory.get_project()
        self.test_user = self.datatypeFactory.get_user()
        
        TestFactory.import_cff(test_user=self.test_user, test_project=self.test_project)
        self.connectivity = self._get_entity(Connectivity())
        self.surface = self._get_entity(CorticalSurface())
                
    def tearDown(self):
        """
        Clean-up tests data
        """
        FilesHelper().remove_project_structure(self.test_project.name)
    
    def _get_entity(self, expected_data, filters=None):
        """
        Checks there is exactly one datatype with required specifications and returns it

        :param expected_data: a class whose entity is to be returned
        :param filters: optional, the returned entity will also have the required filters
        :return: an object of class `expected_data`
        """
        data_types = FlowService().get_available_datatypes(self.test_project.id,
                                                           expected_data.module + "." + expected_data.type, filters)
        self.assertEqual(1, len(data_types), "Project should contain only one data type:" + str(expected_data.type))
        
        entity = ABCAdapter.load_entity_by_gid(data_types[0][2])
        self.assertTrue(entity is not None, "Instance should not be none")
        
        return entity
                   
    def _import(self, import_file_path, surface_gid, connectivity_gid):
        """
        This method is used for importing region mappings
        :param import_file_path: absolute path of the file to be imported
        """
            
        ### Retrieve Adapter instance 
        group = dao.find_group('tvb.adapters.uploaders.region_mapping_importer', 'RegionMapping_Importer')
        importer = ABCAdapter.build_adapter(group)
        importer.meta_data = {DataTypeMetaData.KEY_SUBJECT: "test",
                              DataTypeMetaData.KEY_STATE: "RAW"}
        
        args = {'mapping_file': import_file_path, 'surface': surface_gid, 'connectivity': connectivity_gid}
        
        now = datetime.datetime.now() 
        
        ### Launch import Operation
        FlowService().fire_operation(importer, self.test_user, self.test_project.id, **args)
             
        # During setup we import a CFF which creates an additional RegionMapping
        # So, here we have to find our mapping (just imported)   
        data_filter = FilterChain(fields=[FilterChain.datatype + ".create_date"], operations=[">"], values=[now])
        region_mapping = self._get_entity(RegionMapping(), data_filter)
        
        return region_mapping
    
    
    def test_import_no_surface_or_connectivity(self):
        """
            This method tests import of region mapping without providing a surface or connectivity
        """
        try:
            self._import(self.TXT_FILE, None, self.connectivity.gid)
            self.fail("Import should fail in case Surface is missing")
        except OperationException:
            # Expected exception
            pass

        try:
            self._import(self.TXT_FILE, self.surface.gid, None)
            self.fail("Import should fail in case Connectivity is missing")
        except OperationException:
            # Expected exception
            pass
        

    def test_import_from_txt(self):
        """
            This method tests import of region mapping from TXT file
        """
        self._import_from_file(self.TXT_FILE) 

    def test_import_from_zip(self):
        """
            This method tests import of region mapping from TXT file
        """
        self._import_from_file(self.ZIP_FILE) 

    def test_import_from_bz2(self):
        """
            This method tests import of region mapping from TXT file
        """
        self._import_from_file(self.BZ2_FILE) 


    def _import_from_file(self, import_file):
        """
            This method tests import of region mapping from TXT file
        """
        region_mapping = self._import(import_file, self.surface.gid, self.connectivity.gid) 
        
        self.assertTrue(region_mapping.surface is not None)
        self.assertTrue(region_mapping.connectivity is not None)
        
        array_data = region_mapping.array_data
        self.assertTrue(array_data is not None)
        self.assertEqual(16384, len(array_data))
    
    def test_import_wrong_file_content(self):
        """
            This method tests import of region mapping with:
            - a wrong region number
            - wrong number of regions
            - negative region number
        """
        try:
            self._import(self.WRONG_FILE_1, self.surface.gid, self.connectivity.gid)
            self.fail("Import should fail in case of invalid region number")
        except OperationException:
            # Expected exception
            pass

        try:
            self._import(self.WRONG_FILE_2, self.surface.gid, self.connectivity.gid)
            self.fail("Import should fail in case of invalid regions number")
        except OperationException:
            # Expected exception
            pass
        
        try:
            self._import(self.WRONG_FILE_3, self.surface.gid, self.connectivity.gid)
            self.fail("Import should fail in case of invalid region number (negative number)")
        except OperationException:
            # Expected exception
            pass
                

        
def suite():
    """
    Gather all the tests in a test suite.
    """
    test_suite = unittest.TestSuite()
    test_suite.addTest(unittest.makeSuite(RegionMappingImporterTest))
    return test_suite


if __name__ == "__main__":
    #So you can run tests from this package individually.
    TEST_RUNNER = unittest.TextTestRunner()
    TEST_SUITE = suite()
    TEST_RUNNER.run(TEST_SUITE)